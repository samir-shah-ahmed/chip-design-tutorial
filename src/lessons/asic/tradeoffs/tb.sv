module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst, en;
  reg [7:0] d;
  wire [7:0] q;
  hold dut(.clk(clk), .rst(rst), .en(en), .d(d), .q(q));
  initial begin
    rst = 1; en = 0; d = 8'd0;
    repeat (2) @(posedge clk);
    @(negedge clk); rst = 0; en = 1; d = 8'd9;
    @(posedge clk); #1;
    if (q !== 8'd9) begin $display("FAIL load %0d", q); $finish; end
    @(negedge clk); en = 0; d = 8'd1;
    @(posedge clk); #1;
    if (q === 8'd9) $display("PASS held %0d", q);
    else $display("FAIL held %0d", q);
    $finish;
  end
endmodule
