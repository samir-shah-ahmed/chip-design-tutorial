module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst_n, ce;
  wire [7:0] q;
  counter_ce dut(.clk(clk), .rst_n(rst_n), .ce(ce), .q(q));
  initial begin
    rst_n = 0; ce = 1;
    repeat (2) @(posedge clk);
    rst_n = 1;
    repeat (3) @(posedge clk);
    #1;
    if (q !== 8'd3) begin $display("FAIL q=%0d", q); $finish; end
    ce = 0;
    repeat (2) @(posedge clk);
    #1;
    if (q === 8'd3) $display("PASS q=%0d", q);
    else $display("FAIL held q=%0d", q);
    $finish;
  end
endmodule
