module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst;
  reg [7:0] a, b, c;
  wire [7:0] y;
  pipe dut(.clk(clk), .rst(rst), .a(a), .b(b), .c(c), .y(y));
  initial begin
    rst = 1; a = 0; b = 0; c = 0;
    repeat (2) @(posedge clk);
    @(negedge clk); rst = 0; a = 8'd10; b = 8'd20; c = 8'd3;
    @(posedge clk); #1;
    if (y === 8'd33) begin
      $display("FAIL y was ready after one clock");
      $finish;
    end
    @(posedge clk); #1;
    if (y === 8'd33) $display("PASS y=%0d", y);
    else $display("FAIL y=%0d expect 33", y);
    $finish;
  end
endmodule
