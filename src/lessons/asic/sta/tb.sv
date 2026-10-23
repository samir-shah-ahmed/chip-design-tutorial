module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst;
  reg [7:0] a, b;
  wire [7:0] y;
  add_reg dut(.clk(clk), .rst(rst), .a(a), .b(b), .y(y));
  initial begin
    rst = 1; a = 0; b = 0;
    repeat (2) @(posedge clk);
    @(negedge clk); rst = 0; a = 8'd6; b = 8'd7;
    @(posedge clk); #1;
    if (y === 8'd13) begin
      $display("FAIL sum was ready after one clock");
      $finish;
    end
    @(posedge clk); #1;
    if (y === 8'd13) $display("PASS y=%0d", y);
    else $display("FAIL y=%0d expect 13", y);
    $finish;
  end
endmodule
